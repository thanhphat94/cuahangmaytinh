// Feature-based module for Authentication

/** Một route của feature auth; `component` là tên trang (khớp file trong `pages/`). */
export interface AuthFeatureRoute {
  path: string
  component: string
}

/** Endpoint auth, nối tiếp `baseURL` của axios instance trong `api/api`. */
export interface AuthFeatureApi {
  login: string
  register: string
  profile: string
}

export interface AuthFeatureDefinition {
  name: string
  routes: AuthFeatureRoute[]
  api: AuthFeatureApi
}

export const authFeature: AuthFeatureDefinition = {
  name: 'auth',
  routes: [
    { path: '/login', component: 'LoginPage' },
    { path: '/register', component: 'RegisterPage' },
    { path: '/account', component: 'AccountPage' },
  ],
  api: {
    login: '/users/login',
    register: '/users/register',
    profile: '/users/profile',
  },
}
