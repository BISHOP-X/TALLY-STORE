import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Clock, CheckCircle2, XCircle, Settings } from 'lucide-react'
import Navbar from '@/components/NavbarAuth'
import Footer from '@/components/Footer'
import { useAuth } from '@/contexts/SimpleAuth'
import { useToast } from '@/hooks/use-toast'
import {
  getMyStaffPermissions,
  submitPendingAction,
  type PermissionMap,
  type PermissionKey,
} from '@/lib/staffPermissions'
import {
  supabase,
  getAppSetting,
  upsertAppSetting,
  getAllProductGroups,
  getCategories,
  searchUsers,
  adminAdjustBalance,
  type ProductGroup,
  type Category,
} from '@/lib/supabase'
import { format } from 'date-fns'

// ── Helper ────────────────────────────────────────────────────────────────
function can(perms: PermissionMap, key: PermissionKey) {
  return perms[key]?.is_enabled === true
}
function autoApprove(perms: PermissionMap, key: PermissionKey) {
  return perms[key]?.auto_approve !== false
}

export default function StaffAdminPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [perms, setPerms] = useState<PermissionMap>({} as PermissionMap)
  const [loadingPerms, setLoadingPerms] = useState(true)

  // Rate settings
  const [ngnUsdRate, setNgnUsdRate] = useState('')
  const [savingRate, setSavingRate] = useState(false)

  // Referral commission
  const [referralPct, setReferralPct] = useState('5')
  const [savingReferral, setSavingReferral] = useState(false)

  // Products
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  // Users
  const [userQuery, setUserQuery] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [adjustUserId, setAdjustUserId] = useState('')
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  // My pending actions history
  const [myPending, setMyPending] = useState<any[]>([])
  const [loadingPending, setLoadingPending] = useState(false)

  // ── Load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    getMyStaffPermissions().then(p => {
      setPerms(p)
      setLoadingPerms(false)
    })
  }, [])

  useEffect(() => {
    if (loadingPerms) return
    if (can(perms, 'setting_rate')) {
      getAppSetting('ngn_usd_rate').then(v => setNgnUsdRate(v || ''))
    }
    if (can(perms, 'setting_referral_pct')) {
      getAppSetting('referral_commission_pct').then(v => setReferralPct(v || '5'))
    }
    if (can(perms, 'tab_products') || can(perms, 'tab_templates')) {
      setLoadingProducts(true)
      Promise.all([getAllProductGroups(), getCategories()]).then(([pg, cat]) => {
        setProductGroups(pg)
        setCategories(cat)
        setLoadingProducts(false)
      })
    }
  }, [perms, loadingPerms])

  const loadMyPending = useCallback(async () => {
    if (!user) return
    setLoadingPending(true)
    const { data } = await supabase
      .from('staff_pending_actions')
      .select('*')
      .eq('staff_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    setMyPending(data || [])
    setLoadingPending(false)
  }, [user])

  useEffect(() => { loadMyPending() }, [loadMyPending])

  // ── Actions ──────────────────────────────────────────────────────────────
  async function handleRateChange() {
    if (!ngnUsdRate || isNaN(parseFloat(ngnUsdRate))) return
    setSavingRate(true)
    try {
      const key: PermissionKey = 'setting_rate'
      if (autoApprove(perms, key)) {
        await upsertAppSetting('ngn_usd_rate', ngnUsdRate)
        toast({ title: 'Rate updated' })
      } else {
        const res = await submitPendingAction(key, 'upsert_setting', `Set NGN/USD rate to ${ngnUsdRate}`, { setting_key: 'ngn_usd_rate', value: ngnUsdRate })
        if (res.success) {
          toast({ title: 'Submitted for approval', description: 'The super-admin will review and apply this change.' })
          loadMyPending()
        } else {
          toast({ variant: 'destructive', title: 'Error', description: res.error })
        }
      }
    } finally {
      setSavingRate(false)
    }
  }

  async function handleReferralChange() {
    const val = parseFloat(referralPct)
    if (isNaN(val) || val < 0 || val > 100) return
    setSavingReferral(true)
    try {
      const key: PermissionKey = 'setting_referral_pct'
      if (autoApprove(perms, key)) {
        await upsertAppSetting('referral_commission_pct', referralPct)
        toast({ title: 'Referral commission updated' })
      } else {
        const res = await submitPendingAction(key, 'upsert_setting', `Set referral commission to ${referralPct}%`, { setting_key: 'referral_commission_pct', value: referralPct })
        if (res.success) {
          toast({ title: 'Submitted for approval' })
          loadMyPending()
        } else {
          toast({ variant: 'destructive', title: 'Error', description: res.error })
        }
      }
    } finally {
      setSavingReferral(false)
    }
  }

  async function handleSearchUsers() {
    if (!userQuery.trim()) return
    setSearchingUsers(true)
    const results = await searchUsers(userQuery)
    setUsers(results)
    setSearchingUsers(false)
  }

  async function handleAdjustBalance() {
    if (!adjustUserId || !adjustAmount || isNaN(parseFloat(adjustAmount))) return
    const amount = parseFloat(adjustAmount)
    setAdjusting(true)
    try {
      const key: PermissionKey = 'action_adjust_balance'
      const selectedUser = users.find(u => u.id === adjustUserId)
      const label = `${adjustType === 'add' ? 'Add' : 'Subtract'} ₦${amount.toLocaleString()} ${adjustType === 'add' ? 'to' : 'from'} ${selectedUser?.email || adjustUserId}${adjustReason ? ` — ${adjustReason}` : ''}`
      if (autoApprove(perms, key)) {
        const result = await adminAdjustBalance(adjustUserId, adjustType === 'add' ? amount : -amount, adjustReason || 'Staff adjustment')
        if (result.success) {
          toast({ title: 'Balance adjusted' })
          setAdjustUserId('')
          setAdjustAmount('')
          setAdjustReason('')
        } else {
          toast({ variant: 'destructive', title: 'Error', description: result.error })
        }
      } else {
        const res = await submitPendingAction(key, 'adjust_balance', label, {
          user_id: adjustUserId,
          amount: adjustType === 'add' ? amount : -amount,
          reason: adjustReason,
        })
        if (res.success) {
          toast({ title: 'Submitted for approval' })
          loadMyPending()
          setAdjustUserId('')
          setAdjustAmount('')
          setAdjustReason('')
        } else {
          toast({ variant: 'destructive', title: 'Error', description: res.error })
        }
      }
    } finally {
      setAdjusting(false)
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loadingPerms) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const enabledTabs = [
    can(perms, 'tab_templates') && 'templates',
    can(perms, 'tab_products') && 'products',
    can(perms, 'tab_users') && 'users',
    (can(perms, 'setting_rate') || can(perms, 'setting_referral_pct') || can(perms, 'setting_ercas') || can(perms, 'setting_bitrefill_markup')) && 'settings',
  ].filter(Boolean) as string[]

  if (enabledTabs.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-6 py-32 text-center">
          <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No permissions assigned yet</h2>
          <p className="text-muted-foreground">Ask your administrator to enable capabilities for your account.</p>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Staff Panel</h1>
          <p className="text-muted-foreground text-sm">You can only see and change what your administrator has enabled for you.</p>
        </div>

        <Tabs defaultValue={enabledTabs[0]} className="space-y-6">
          <TabsList className="flex flex-wrap gap-1 h-auto">
            {enabledTabs.map(t => (
              <TabsTrigger key={t} value={t} className="capitalize">{t === 'templates' ? 'Products' : t}</TabsTrigger>
            ))}
            <TabsTrigger value="my-actions">My Requests</TabsTrigger>
          </TabsList>

          {/* ── Templates / Products listing ───────────────────── */}
          {can(perms, 'tab_templates') && (
            <TabsContent value="templates" className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Products</CardTitle></CardHeader>
                <CardContent>
                  {loadingProducts ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                      {productGroups.map(pg => {
                        const cat = categories.find(c => c.id === pg.category_id)
                        return (
                          <div key={pg.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
                            <div>
                              <p className="font-medium">{pg.name}</p>
                              <p className="text-muted-foreground text-xs">{cat?.name} · ₦{pg.price.toLocaleString()} · {pg.stock_count} in stock</p>
                            </div>
                            <Badge variant={pg.is_active ? 'default' : 'secondary'}>{pg.is_active ? 'Active' : 'Inactive'}</Badge>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ── Users ─────────────────────────────────────────── */}
          {can(perms, 'tab_users') && (
            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Search Users</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Email or name..."
                      value={userQuery}
                      onChange={e => setUserQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearchUsers()}
                    />
                    <Button onClick={handleSearchUsers} disabled={searchingUsers}>
                      {searchingUsers ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {users.map(u => (
                      <div key={u.id} className="p-3 rounded-lg border text-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{u.email}</p>
                            <p className="text-muted-foreground text-xs">Balance: ₦{(u.wallet_balance || 0).toLocaleString()}</p>
                          </div>
                          {can(perms, 'action_adjust_balance') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setAdjustUserId(u.id)}
                            >
                              Adjust Balance
                            </Button>
                          )}
                        </div>
                        {adjustUserId === u.id && can(perms, 'action_adjust_balance') && (
                          <div className="mt-3 space-y-2 border-t pt-3">
                            <div className="flex gap-2">
                              <Button size="sm" variant={adjustType === 'add' ? 'default' : 'outline'} onClick={() => setAdjustType('add')}>Add</Button>
                              <Button size="sm" variant={adjustType === 'subtract' ? 'default' : 'outline'} onClick={() => setAdjustType('subtract')}>Subtract</Button>
                            </div>
                            <Input
                              type="number"
                              placeholder="Amount (₦)"
                              value={adjustAmount}
                              onChange={e => setAdjustAmount(e.target.value)}
                            />
                            <Input
                              placeholder="Reason (optional)"
                              value={adjustReason}
                              onChange={e => setAdjustReason(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleAdjustBalance} disabled={adjusting}>
                                {adjusting ? <Loader2 className="h-4 w-4 animate-spin" /> : autoApprove(perms, 'action_adjust_balance') ? 'Apply' : 'Submit for Approval'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setAdjustUserId('')}>Cancel</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ── Settings ──────────────────────────────────────── */}
          {(can(perms, 'setting_rate') || can(perms, 'setting_referral_pct')) && (
            <TabsContent value="settings" className="space-y-4">
              {can(perms, 'setting_rate') && (
                <Card>
                  <CardHeader>
                    <CardTitle>NGN/USD Rate</CardTitle>
                    {!autoApprove(perms, 'setting_rate') && (
                      <Badge variant="outline" className="w-fit flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Requires approval
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    <Input
                      type="number"
                      value={ngnUsdRate}
                      onChange={e => setNgnUsdRate(e.target.value)}
                      placeholder="e.g. 1600"
                      className="max-w-xs"
                    />
                    <Button onClick={handleRateChange} disabled={savingRate}>
                      {savingRate ? <Loader2 className="h-4 w-4 animate-spin" /> : autoApprove(perms, 'setting_rate') ? 'Save' : 'Submit for Approval'}
                    </Button>
                  </CardContent>
                </Card>
              )}
              {can(perms, 'setting_referral_pct') && (
                <Card>
                  <CardHeader>
                    <CardTitle>Referral Commission %</CardTitle>
                    {!autoApprove(perms, 'setting_referral_pct') && (
                      <Badge variant="outline" className="w-fit flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Requires approval
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    <Input
                      type="number"
                      value={referralPct}
                      onChange={e => setReferralPct(e.target.value)}
                      placeholder="e.g. 5"
                      className="max-w-xs"
                    />
                    <Button onClick={handleReferralChange} disabled={savingReferral}>
                      {savingReferral ? <Loader2 className="h-4 w-4 animate-spin" /> : autoApprove(perms, 'setting_referral_pct') ? 'Save' : 'Submit for Approval'}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {/* ── My Pending Actions ────────────────────────────── */}
          <TabsContent value="my-actions" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>My Submitted Requests</CardTitle></CardHeader>
              <CardContent>
                {loadingPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : myPending.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No requests yet.</p>
                ) : (
                  <div className="space-y-2">
                    {myPending.map(action => (
                      <div key={action.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
                        <div>
                          <p className="font-medium">{action.action_label}</p>
                          <p className="text-muted-foreground text-xs">{format(new Date(action.created_at), 'dd MMM yyyy HH:mm')}</p>
                        </div>
                        <Badge variant={
                          action.status === 'approved' ? 'default' :
                          action.status === 'rejected' ? 'destructive' : 'secondary'
                        }>
                          {action.status === 'approved' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {action.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                          {action.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                          {action.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  )
}
