import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createSmmPanelClient } from '../_shared/smm-panel-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Map panel status to our status
 */
function mapPanelStatus(panelStatus: string): string {
  const statusMap: Record<string, string> = {
    'Pending': 'pending',
    'In progress': 'in_progress',
    'Processing': 'processing',
    'Completed': 'completed',
    'Partial': 'partial',
    'Canceled': 'cancelled',
    'Cancelled': 'cancelled',
    'Refunded': 'cancelled',
    'Failed': 'failed',
  };

  return statusMap[panelStatus] || panelStatus.toLowerCase().replace(' ', '_');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          persistSession: false,
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const { order_id } = await req.json();

    if (!order_id) {
      throw new Error('order_id is required');
    }

    // Initialize admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get order from database
    const { data: order, error: orderError } = await supabaseAdmin
      .from('smm_orders')
      .select('*, smm_services(name, category)')
      .eq('id', order_id)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // If no external order ID, return current status
    if (!order.external_order_id) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            order_id: order.id,
            reference: order.reference,
            status: order.status,
            message: 'Order has not been submitted to panel yet',
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Check status from panel
    const smmClient = createSmmPanelClient();
    const panelStatus = await smmClient.getOrderStatus(order.external_order_id);

    console.log(`Panel status for order ${order.external_order_id}:`, panelStatus);

    if (panelStatus.error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Panel error: ${panelStatus.error}`,
          data: {
            order_id: order.id,
            reference: order.reference,
            status: order.status,
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Map and update status
    const newStatus = mapPanelStatus(panelStatus.status || 'pending');
    const isCompleted = newStatus === 'completed' || newStatus === 'partial' || newStatus === 'cancelled';

    // Update order in database
    const updateData: Record<string, any> = {
      status: newStatus,
      start_count: panelStatus.start_count ? parseInt(panelStatus.start_count) : order.start_count,
      remains: panelStatus.remains ? parseInt(panelStatus.remains) : order.remains,
      panel_response: panelStatus,
      updated_at: new Date().toISOString(),
    };

    if (isCompleted && !order.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }

    await supabaseAdmin
      .from('smm_orders')
      .update(updateData)
      .eq('id', order.id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          order_id: order.id,
          reference: order.reference,
          external_order_id: order.external_order_id,
          service: order.smm_services?.name,
          link: order.link,
          quantity: order.quantity,
          amount: order.amount_ngn,
          status: newStatus,
          start_count: updateData.start_count,
          remains: updateData.remains,
          charge: panelStatus.charge,
          created_at: order.created_at,
          updated_at: updateData.updated_at,
          completed_at: updateData.completed_at || order.completed_at,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('SMM Check Status Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' ? 401 : 400,
      }
    );
  }
});
