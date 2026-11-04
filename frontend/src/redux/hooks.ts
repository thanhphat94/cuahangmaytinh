import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux'
import type { AppDispatch, RootState } from './store'

/** Dùng thay cho `useSelector` trần — strict mode không suy ra được shape của `state`. */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

/** Dùng thay cho `useDispatch` trần — cho phép dispatch thunk. */
export const useAppDispatch = () => useDispatch<AppDispatch>()
