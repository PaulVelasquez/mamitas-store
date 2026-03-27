import { useState, useEffect, useRef } from 'react'
import { subscribeProducts, addProduct, updateProduct, deleteProduct } from '../services/productService'
import { formatCurrency } from '../lib/formatters'
import type { Product } from '../types'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'

interface FormData {
  name: string
  price: string
  category: string
  image: string | null
}

const emptyForm: FormData = { name: '', price: '', category: '', image: null }

const MAX_IMAGE_SIZE = 400 // max width/height in px — keeps base64 under ~50KB
const JPEG_QUALITY = 0.5 // aggressive compression for Firestore storage

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
          if (width > height) {
            height = Math.round((height * MAX_IMAGE_SIZE) / width)
            width = MAX_IMAGE_SIZE
          } else {
            width = Math.round((width * MAX_IMAGE_SIZE) / height)
            height = MAX_IMAGE_SIZE
          }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
        const sizeKB = Math.round((dataUrl.length * 3) / 4 / 1024)
        if (sizeKB > 800) {
          // If still too large, shrink further
          const scale = Math.sqrt(800 / sizeKB)
          canvas.width = Math.round(width * scale)
          canvas.height = Math.round(height * scale)
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL('image/jpeg', 0.4))
        } else {
          resolve(dataUrl)
        }
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const unsub = subscribeProducts((p) => {
      setProducts(p)
      setLoading(false)
    })
    return unsub
  }, [])

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditingId(p.id)
    setForm({ name: p.name, price: (p.price / 100).toFixed(2), category: p.category, image: p.image || null })
    setModalOpen(true)
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await compressImage(file)
      setForm((f) => ({ ...f, image: dataUrl }))
    } catch {
      alert('Failed to load image')
    }
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const priceNum = Math.round(parseFloat(form.price) * 100)
    if (!form.name.trim() || isNaN(priceNum) || priceNum <= 0) return
    setSaving(true)
    try {
      if (editingId) {
        await updateProduct(editingId, { name: form.name.trim(), price: priceNum, category: form.category.trim(), image: form.image })
      } else {
        await addProduct({ name: form.name.trim(), price: priceNum, category: form.category.trim() || 'General', image: form.image })
      }
      setModalOpen(false)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return
    await deleteProduct(id)
  }

  const toggleStock = async (p: Product) => {
    await updateProduct(p.id, { inStock: !p.inStock })
  }

  const filtered = products.filter((p) => {
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  })

  if (loading) return <Spinner />

  return (
    <div className="p-4">
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
      </div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Products ({filtered.length})</h2>
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-gray-400">
          {products.length === 0 ? 'No products yet. Tap + to add one.' : 'No products match your search.'}
        </p>
      )}

      <div className="space-y-2">
        {filtered.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm border border-gray-100">
            {p.image ? (
              <img src={p.image} alt={p.name} className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0" onClick={() => openEdit(p)}>
              <p className="font-medium text-gray-800 truncate">{p.name}</p>
              <p className="text-sm text-gray-500">
                {formatCurrency(p.price)} &middot; {p.category}
              </p>
            </div>
            <button
              onClick={() => toggleStock(p)}
              className={`rounded-full px-3 py-1 text-xs font-medium flex-shrink-0 ${
                p.inStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
              }`}
            >
              {p.inStock ? 'In Stock' : 'Out'}
            </button>
            <button onClick={() => handleDelete(p.id)} className="text-red-400 p-1 flex-shrink-0">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-3xl text-white shadow-lg active:scale-95"
      >
        +
      </button>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Product' : 'Add Product'}>
        <form onSubmit={handleSave} className="space-y-4">
          {/* Image Upload */}
          <div className="flex flex-col items-center gap-3">
            {form.image ? (
              <div className="relative">
                <img src={form.image} alt="Preview" className="h-28 w-28 rounded-xl object-cover" />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, image: null }))}
                  className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow"
                >
                  &times;
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 transition-colors hover:border-blue-400"
                >
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                  </svg>
                  <span className="mt-1 text-[10px]">Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 transition-colors hover:border-blue-400"
                >
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                  </svg>
                  <span className="mt-1 text-[10px]">Gallery</span>
                </button>
              </div>
            )}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              className="hidden"
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          <input
            type="text"
            placeholder="Product name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-blue-500"
            required
          />
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Price (e.g. 9.99)"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-blue-500"
            required
          />
          <input
            type="text"
            placeholder="Category (e.g. Food, Drinks)"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-blue-600 py-3 text-base font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : editingId ? 'Update' : 'Add Product'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
