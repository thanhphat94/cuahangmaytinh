# Cửa Hàng Máy Tính - Frontend

Frontend website cho Cửa hàng máy tính, xây dựng bằng MERN Stack.

## Công nghệ sử dụng

- **React 18** - UI library
- **Vite** - Build tool
- **React Router DOM** - Routing
- **Redux Toolkit** - State management
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Axios** - HTTP client

## Cấu trúc thư mục

```
frontend/
├── public/                 # Static files
│   └── images/
├── src/
│   ├── api/               # API configuration
│   ├── assets/            # Images, fonts, icons
│   ├── components/        # Reusable UI components
│   ├── context/           # React Context
│   ├── features/          # Feature-based modules
│   ├── hooks/             # Custom React hooks
│   ├── layout/            # Layout components (Header, Footer)
│   ├── pages/             # Application pages
│   ├── redux/             # Redux store & slices
│   ├── routes/            # Route configuration
│   ├── services/          # API services
│   ├── themes/            # Theme configuration
│   ├── utils/             # Helper functions & constants
│   ├── validators/        # Form validators
│   ├── App.jsx            # Main App component
│   ├── index.css          # Global styles
│   └── main.jsx           # Entry point
├── .env                   # Environment variables
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

## Cài đặt

```bash
npm install
```

## Chạy development

```bash
npm run dev
```

## Build production

```bash
npm run build
```

## Các trang chính

- `/` - Trang chủ
- `/product/:id` - Chi tiết sản phẩm
- `/cart` - Giỏ hàng
- `/contact` - Liên hệ

## Tính năng

- ✅ Responsive design
- ✅ Giỏ hàng với Context API
- ✅ Redux state management
- ✅ Animation scroll
- ✅ Product carousel
- ✅ Category navigation
- ✅ Search functionality
- ✅ Contact form
