import { useState, useEffect, useCallback } from 'react'
import type { FormEvent } from 'react'
import {
  FolderTree, Loader2, Camera, Laptop, Monitor, Printer, X, Package, Layers,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import api, { getErrorMessage } from '../../api/api'
import type { Category } from '../../types'
import { useToast } from '../../components/Toast'

/** Ảnh đại diện: chọn icon + màu theo nội dung danh mục (thay cho ảnh stock không liên quan). */
type CategoryLook = { Icon: LucideIcon; bg: string; fg: string }

const getLook = (slug: string, name: string): CategoryLook => {
  const key = `${slug} ${name}`.toLowerCase()
  if (key.includes('camera'))                           return { Icon: Camera,     bg: 'bg-red-50',    fg: 'text-red-500' }
  if (key.includes('laptop'))                           return { Icon: Laptop,     bg: 'bg-indigo-50', fg: 'text-indigo-500' }
  if (key.includes('may-in') || key.includes('máy in')) return { Icon: Printer,    bg: 'bg-green-50',  fg: 'text-green-600' }
  if (key.includes('may-tinh') || key.includes('máy tính') || key.includes('pc'))
                                                         return { Icon: Monitor,    bg: 'bg-blue-50',   fg: 'text-blue-500' }
  return { Icon: FolderTree, bg: 'bg-gray-100', fg: 'text-gray-500' }
}

function CategoryThumb({ category, size = 'md' }: { category: Category; size?: 'md' | 'lg' }) {
  const [imgFailed, setImgFailed] = useState(false)
  const { Icon, bg, fg } = getLook(category.slug, category.name)
  const box = size === 'lg' ? 'w-16 h-16' : 'w-12 h-12'
  const iconSize = size === 'lg' ? 32 : 24

  if (category.image && !imgFailed) {
    return (
      <img
        src={category.image}
        alt={category.name}
        onError={() => setImgFailed(true)}
        className={`${box} object-cover rounded-lg shrink-0`}
      />
    )
  }
  return (
    <div className={`${box} ${bg} rounded-lg flex items-center justify-center shrink-0`}>
      <Icon size={iconSize} className={fg} />
    </div>
  )
}

type DetailModalProps = {
  category: Category
  onClose: () => void
  onSaved: (updated: Category) => void
}

function CategoryDetailModal({ category, onClose, onSaved }: DetailModalProps) {
  const toast = useToast()
  const [name, setName] = useState(category.name)
  const [description, setDescription] = useState(category.description ?? '')
  const [saving, setSaving] = useState(false)
  const [productCount, setProductCount] = useState<number | null>(null)

  // Đếm số sản phẩm đang bán trong danh mục
  useEffect(() => {
    let cancelled = false
    api.get<{ total?: number }>('/products', { params: { category: category._id || category.id, limit: 1 } })
      .then((r) => { if (!cancelled) setProductCount(r.data.total ?? 0) })
      .catch(() => { if (!cancelled) setProductCount(null) })
    return () => { cancelled = true }
  }, [category])

  const dirty = name.trim() !== category.name || description.trim() !== (category.description ?? '')

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.warning('Tên danh mục không được để trống')
      return
    }
    setSaving(true)
    try {
      const res = await api.put<Category>(`/admin/categories/${category._id || category.id}`, {
        name: name.trim(),
        description: description.trim() || null,
      })
      toast.success('Đã cập nhật danh mục')
      onSaved({ ...category, ...res.data })
      onClose()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Cập nhật thất bại'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={handleSave}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto text-left"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-lg text-gray-800">Chi tiết danh mục</h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center gap-4">
            <CategoryThumb category={category} size="lg" />
            <div>
              <p className="font-bold text-gray-800">{category.name}</p>
              <p className="text-sm text-gray-500">/{category.slug}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 flex items-center gap-1"><Package size={12} /> Sản phẩm đang bán</p>
              <p className="text-xl font-bold text-gray-800">{productCount === null ? '…' : productCount}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 flex items-center gap-1"><Layers size={12} /> Trạng thái</p>
              <p className={`text-sm font-semibold mt-1 ${category.isActive === false ? 'text-red-500' : 'text-green-600'}`}>
                {category.isActive === false ? 'Đang ẩn' : 'Đang hiển thị'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên danh mục *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#1a73e8]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#1a73e8] resize-none"
              placeholder="Mô tả ngắn về danh mục"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Đóng</button>
          <button
            type="submit"
            disabled={!dirty || saving}
            className="px-4 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1557b0] disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 size={16} className="animate-spin" />} Lưu thay đổi
          </button>
        </div>
      </form>
    </div>
  )
}

function AdminCategories() {
  const toast = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Category | null>(null)

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get<Category[]>('/categories')
      setCategories(res.data)
    } catch {
      toast.error('Không thể tải danh mục')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Quản lý danh mục</h2>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[300px]">
          <Loader2 className="animate-spin text-[#1a73e8]" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
          {categories.length === 0 ? (
            <p className="text-gray-500 col-span-full text-center py-8">Chưa có danh mục nào</p>
          ) : (
            categories.map((category) => (
              <div key={category._id || category.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
                <div className="flex items-center gap-3">
                  <CategoryThumb category={category} />
                  <div className="min-w-0">
                    <h3 className="font-bold truncate">{category.name}</h3>
                    <p className="text-xs text-gray-500">/{category.slug}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-3 h-10 overflow-hidden line-clamp-2">
                  {category.description || 'Chưa có mô tả'}
                </p>
                <button
                  type="button"
                  onClick={() => setSelected(category)}
                  className="flex items-center gap-2 mt-3 text-sm font-medium text-[#1a73e8] hover:underline"
                >
                  <FolderTree size={14} /> Chi tiết
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {selected && (
        <CategoryDetailModal
          category={selected}
          onClose={() => setSelected(null)}
          onSaved={(updated) =>
            setCategories((prev) => prev.map((c) => ((c._id || c.id) === (updated._id || updated.id) ? updated : c)))
          }
        />
      )}
    </div>
  )
}

export default AdminCategories
