// apps/components/RootLayout.jsx (was .tsx)
import StyledComponentsRegistry from '../lib/registry';
import { GlobalStyles } from '../shared/styles/GlobalStyles';

export default function RootLayout({ children, title = 'PREPG3', description = 'Property Investment Platform' }) {
  return (
    <html lang="en">
      <head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <StyledComponentsRegistry>
          <GlobalStyles />
          {children}
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}