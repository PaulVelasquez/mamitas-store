import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Product } from '../types'

const col = collection(db, 'products')

export function subscribeProducts(callback: (products: Product[]) => void) {
  const q = query(col, orderBy('name'))
  return onSnapshot(q, (snap) => {
    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product)
    callback(products)
  })
}

export async function addProduct(
  data: { name: string; price: number; category: string; image: string | null },
): Promise<string> {
  const ref = await addDoc(col, {
    name: data.name,
    price: data.price,
    category: data.category,
    image: data.image,
    inStock: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })
  return ref.id
}

export async function updateProduct(
  id: string,
  data: Partial<Pick<Product, 'name' | 'price' | 'category' | 'inStock' | 'image'>>
) {
  await updateDoc(doc(db, 'products', id), { ...data, updatedAt: Timestamp.now() })
}

export async function deleteProduct(id: string) {
  await deleteDoc(doc(db, 'products', id))
}
