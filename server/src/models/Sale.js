import mongoose from 'mongoose'

// Each line is a SNAPSHOT: name and price are copied at the moment of sale,
// so changing or deleting the product later never rewrites history.
const itemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
)

export const PAYMENT_METHODS = ['cash', 'card', 'mobile']

const saleSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Transaction id shown to the shopkeeper and in the history table.
    reference: { type: String, required: true, trim: true, uppercase: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true, default: 'cash' },
    items: { type: [itemSchema], validate: [(v) => v.length > 0, 'A sale needs at least one item'] },
    total: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

// Speeds up "my sales, newest first" and date-range filters
saleSchema.index({ owner: 1, date: -1 })
// A shop cannot have two sales with the same transaction id. Partial so legacy
// sales can be saved before `npm run backfill` gives them a reference.
saleSchema.index(
  { owner: 1, reference: 1 },
  { unique: true, partialFilterExpression: { reference: { $type: 'string' } } }
)

export default mongoose.model('Sale', saleSchema)
