// apps/components/RootLayout.jsx (was .tsx)
import StyledComponentsRegistry from "../lib/registry";
import { GlobalStyles } from "../shared/styles/GlobalStyles";
import logo from "../shared/images/logo.png";

export default function RootLayout({
  children,
  title = "PREPG3",
  description = "Property Investment Platform",
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href={logo.src} type="image/png" sizes="80x80" />
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
