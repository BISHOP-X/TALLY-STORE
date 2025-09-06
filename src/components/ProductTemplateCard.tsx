import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Minus, ShoppingCart, Package, Star } from 'lucide-react'
import { type ProductGroup, type Category } from '@/lib/supabase'

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

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= productGroup.stock_count) {
      setQuantity(newQuantity)
    }
  }

  const handleAddToCart = () => {
    onAddToCart(productGroup.id, quantity)
  }

  const isOutOfStock = productGroup.stock_count === 0
  const isLowStock = productGroup.stock_count > 0 && productGroup.stock_count < 5

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="group-hover:text-primary transition-colors text-lg">
                {productGroup.name}
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {category.name}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">
              {productGroup.description}
            </p>

            {/* Features */}
            {productGroup.features && productGroup.features.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {productGroup.features.slice(0, 3).map((feature, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {feature}
                  </Badge>
                ))}
                {productGroup.features.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{productGroup.features.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {/* Stock and Price Info */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {isOutOfStock ? (
                <Badge variant="destructive">Out of Stock</Badge>
              ) : (
                <>
                  <span className={isLowStock ? 'text-orange-600 font-medium' : 'text-muted-foreground'}>
                    {productGroup.stock_count} available
                  </span>
                  {isLowStock && <Badge variant="outline" className="ml-2">Low Stock</Badge>}
                </>
              )}
            </span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              ₦{productGroup.price.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">per account</div>
          </div>
        </div>

        {/* Quantity Selection */}
        {!isOutOfStock && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Quantity:</label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                
                <Input
                  type="number"
                  min="1"
                  max={productGroup.stock_count}
                  value={quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  className="w-16 h-8 text-center"
                />
                
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= productGroup.stock_count}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Total Price */}
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Total:</span>
              <span className="text-lg font-bold text-primary">
                ₦{(productGroup.price * quantity).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {isOutOfStock ? (
            <Button disabled className="w-full">
              <Package className="h-4 w-4 mr-2" />
              Out of Stock
            </Button>
          ) : (
            <Button onClick={handleAddToCart} className="w-full">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add {quantity} Account{quantity > 1 ? 's' : ''} to Cart
            </Button>
          )}
          
          <Button variant="outline" className="w-full" size="sm">
            <Star className="h-4 w-4 mr-2" />
            View Details
          </Button>
        </div>

        {/* Quality Indicators */}
        <div className="flex justify-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Verified
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            Instant Delivery
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            Premium Quality
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
