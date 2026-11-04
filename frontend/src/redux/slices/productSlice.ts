import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { productService } from '../../services/productService'
import type { Product } from '../../types'

/** Trạng thái slice `products`. Slice này chưa được đăng ký trong `redux/store.ts`. */
type ProductStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

interface ProductState {
  items: Product[]
  hotDeals: Product[]
  newProducts: Product[]
  selectedProduct: Product | null
  status: ProductStatus
  error: string | null
}

const initialState: ProductState = {
  items: [],
  hotDeals: [],
  newProducts: [],
  selectedProduct: null,
  status: 'idle',
  error: null,
}

export const fetchProducts = createAsyncThunk<Product[], void>(
  'products/fetchProducts',
  async () => {
    const response = await productService.getAll()
    return response.data.products
  }
)

export const fetchProductBySlug = createAsyncThunk<Product, string>(
  'products/fetchProductBySlug',
  async (slug) => {
    const response = await productService.getBySlug(slug)
    return response.data
  }
)

export const fetchFeaturedProducts = createAsyncThunk<Product[], void>(
  'products/fetchFeatured',
  async () => {
    const response = await productService.getFeatured()
    return response.data
  }
)

export const fetchNewProducts = createAsyncThunk<Product[], void>(
  'products/fetchNew',
  async () => {
    const response = await productService.getNewProducts()
    return response.data
  }
)

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setHotDeals: (state, action: PayloadAction<Product[]>) => {
      state.hotDeals = action.payload
    },
    setNewProducts: (state, action: PayloadAction<Product[]>) => {
      state.newProducts = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message ?? null
      })
      .addCase(fetchProductBySlug.fulfilled, (state, action) => {
        state.selectedProduct = action.payload
      })
      .addCase(fetchFeaturedProducts.fulfilled, (state, action) => {
        state.hotDeals = action.payload
      })
      .addCase(fetchNewProducts.fulfilled, (state, action) => {
        state.newProducts = action.payload
      })
  },
})

export const { setHotDeals, setNewProducts } = productSlice.actions
export default productSlice.reducer
