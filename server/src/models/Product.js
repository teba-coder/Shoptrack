import mongoose from 'mongoose'

const productSchema = new mongoose.Schema(
  {
    // Every product belongs to one shop owner. Every query filters by this.
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Human-readable stock code, e.g. GRO-0001. Unique inside one shop.
    sku: { type: String, required: [true, 'SKU is required'], trim: true, uppercase: true, maxlength: 24 },
    name: { type: String, required: [true, 'Product name is required'], trim: true, maxlength: 100 },
    category: { type: String, trim: true, default: 'General', maxlength: 50 },
    price: { type: Number, required: [true, 'Price is required'], min: [0, 'Price cannot be negative'] },
    stock: {
      type: Number, required: [true, 'Stock is required'], min: [0, 'Stock cannot be negative'],
      validate: { validator: Number.isInteger, message: 'Stock must be a whole number' },
    },
    lowStockLevel: { type: Number, default: 5, min: 0 },
  },
  { timestamps: true }
)

// Two products in the same shop cannot share a SKU (other shops can reuse the code).
// The partial filter lets old documents without a SKU exist until `npm run backfill`
// has filled them in; after that the unique rule applies to every product.
productSchema.index(
  { owner: 1, sku: 1 },
  { unique: true, partialFilterExpression: { sku: { $type: 'string' } } }
)

export default mongoose.model('Product', productSchema)
