import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider, createTheme } from '@mantine/core'
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import './index.css'
import App from './App.tsx'

const theme = createTheme({
  fontFamily: "'Inter', system-ui, sans-serif",
  primaryColor: 'violet',
  defaultRadius: 'md',
  colors: {
    dark: [
      '#f1f0ff', // 0
      '#9391b0', // 1
      '#4e4d6a', // 2
      '#2e2d45', // 3
      '#1c1c28', // 4
      '#16161f', // 5
      '#111118', // 6
      '#0e0e16', // 7
      '#0a0a0f', // 8
      '#060608', // 9
    ],
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <App />
      </MantineProvider>
    </BrowserRouter>
  </StrictMode>,
)

