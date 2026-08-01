import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { FavoritosProvider } from './hooks/useFavoritos'
import { CategoryPage } from './pages/CategoryPage'
import { HomePage } from './pages/HomePage'

export default function App() {
  return (
    <FavoritosProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/categoria/:id" element={<CategoryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </FavoritosProvider>
  )
}
