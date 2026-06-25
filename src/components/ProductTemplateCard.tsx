import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Minus, ShoppingCart, Package, Star } from 'lucide-react'
import { type ProductGroup, type Category } from '@/lib/supabase'
import { useCurrency } from '@/contexts/CurrencyContext'

interface ProductTemplateCardProps {
  productGroup: ProductGroup
  category: Category
  onAddToCart: (productGroupId: string, quantity: number) => void
}

export default function ProductTemplateCard({ 
  productGroup, 
  category, 
  onAddToCart 
}: ProductTemplateCardProps) {
  const [quantity, setQuantity] = useState(1)
  const { formatPrice } = useCurrency()

  // A product is purchasable if it has pre-stocked accounts, OR it's configured
  // to auto-fulfill live from MuaBanVia once stock runs out. In the auto-fulfill
  // case stock_count can legitimately read 0 while still being buyable -
  // process-purchase attempts a live MuaBanVia fulfillment server-side and only
  // fails the request if that genuinely can't deliver. Gating purely on
  // stock_count was blocking the buy button (and therefore the auto-fulfill
  // call itself) from ever firing for these products.
  const canAutoFulfill = !!(productGroup.auto_fulfill_enabled && productGroup.muabanvia_product_id)
  const isOutOfStock = productGroup.stock_count === 0 && !canAutoFulfill
  const isLowStock = productGroup.stock_count > 0 && productGroup.stock_count < 5
  // Quantity controls need an upper bound; use the pre-stocked count if any,
  // otherwise allow a small default range since MuaBanVia fulfills on demand.
  const maxQuantity = productGroup.stock_count > 0 ? productGroup.stock_count : 10

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity)
    }
  }

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    onAddToCart(productGroup.id, quantity)
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
      <CardHeader className="pb-2.5 px-3.5 pt-3.5">
        <CardTitle
          className="min-h-[2.5em] overflow-hidden text-sm leading-snug transition-colors group-hover:text-primary [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
          title={productGroup.name}
        >
          {productGroup.name}
        </CardTitle>
        <Badge variant="outline" className="mt-1 w-fit text-[10px] px-1.5 py-0">
          {category.name}
        </Badge>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
          {productGroup.description}
        </p>
      </CardHeader>

      <CardContent className="pt-0 px-3.5 pb-3.5 space-y-2.5">
        {/* Stock and Price Info */}
        <div className="flex justify-between items-center">
          <span className="text-xs">
            {isOutOfStock ? (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Out of Stock</Badge>
            ) : productGroup.stock_count > 0 ? (
              <span className={isLowStock ? 'text-orange-600 font-medium' : 'text-muted-foreground'}>
                {productGroup.stock_count} available
              </span>
            ) : (
              <span className="text-muted-foreground">Instant delivery</span>
            )}
          </span>
          <div className="text-right">
            <div className="text-base font-bold text-primary leading-tight">
              {formatPrice(productGroup.price)}
            </div>
          </div>
        </div>

        {/* Quantity Selection */}
        {!isOutOfStock && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>

              <Input
                type="number"
                min="1"
                max={maxQuantity}
                value={quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                className="w-10 h-6 text-center px-1 text-xs"
              />

              <Button
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= maxQuantity}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <span className="text-xs font-semibold text-primary">
              {formatPrice(productGroup.price * quantity)}
            </span>
          </div>
        )}

        {/* Action Button */}
        {isOutOfStock ? (
          <Button disabled size="sm" className="w-full h-9 text-xs">
            <Package className="h-3.5 w-3.5 mr-1.5" />
            Out of Stock
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={handleAddToCart} className="w-full h-9 text-xs">
            <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
            Purchase Now
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
