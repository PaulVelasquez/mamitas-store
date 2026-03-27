import { Timestamp } from 'firebase/firestore'

export interface User {
  username: string
  passwordHash: string
  salt: string
  displayName: string
  role: 'admin' | 'cashier'
  createdAt: Timestamp
}

export interface UserSession {
  username: string
  displayName: string
  role: 'admin' | 'cashier'
}

export interface Product {
  id: string
  name: string
  price: number // cents
  category: string
  image: string | null // base64 data URL
  inStock: boolean
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface TransactionItem {
  productId: string
  productName: string
  price: number // cents at time of sale
  quantity: number
}

export interface Transaction {
  id: string
  items: TransactionItem[]
  totalAmount: number // cents
  cashier: string
  createdAt: Timestamp
}
