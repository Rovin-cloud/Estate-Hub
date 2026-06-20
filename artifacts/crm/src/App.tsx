import { useEffect } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Layout } from "./components/layout";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useRole } from "@/hooks/useRole";
import NotFound from "@/pages/not-found";

import Dashboard from "./pages/dashboard";
import Leads from "./pages/leads";
import LeadDetail from "./pages/lead-detail";
import Customers from "./pages/customers";
import Properties from "./pages/properties";
import Tasks from "./pages/tasks";
import Pipeline from "./pages/pipeline";
import Payments from "./pages/payments";

import AdminUsers from "./pages/admin/users";
import AssignLeads from "./pages/admin/assign-leads";
import SalesDashboard from "./pages/sales/dashboard";
import SalesLeads from "./pages/sales/leads";
import ClientDashboard from "./pages/client/dashboard";
import ClientPayments from "./pages/client/payments";
import ClientProperties from "./pages/client/properties";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(160 84% 20%)",
    colorForeground: "hsl(220 20% 10%)",
    colorMutedForeground: "hsl(220 10% 40%)",
    colorDanger: "hsl(0 84% 60%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(0 0% 100%)",
    colorInputForeground: "hsl(220 20% 10%)",
    colorNeutral: "hsl(220 15% 90%)",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.375rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden border shadow-lg",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-2xl font-bold text-foreground",
    headerSubtitle: "text-sm text-muted-foreground",
    socialButtonsBlockButtonText: "text-sm font-medium",
    formFieldLabel: "text-sm font-medium text-foreground",
    footerActionLink: "text-sm font-medium text-primary hover:text-primary/90",
    footerActionText: "text-sm text-muted-foreground",
    dividerText: "text-sm text-muted-foreground",
    identityPreviewEditButton: "text-primary hover:text-primary/90",
    formFieldSuccessText: "text-sm text-emerald-600",
    alertText: "text-sm text-danger",
    logoBox: "h-8 mb-6 justify-center flex",
    logoImage: "h-full w-auto",
    socialButtonsBlockButton: "w-full justify-center bg-white border border-input hover:bg-muted/50 transition-colors",
    formButtonPrimary: "w-full justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors",
    formFieldInput: "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    footerAction: "mt-4 text-center",
    dividerLine: "bg-border h-px",
    alert: "rounded-md bg-destructive/10 p-4 border border-destructive/20 text-destructive",
    otpCodeFieldInput: "border-input bg-transparent text-foreground",
    formFieldRow: "mb-4",
    main: "flex flex-col w-full",
  },
};

function RoleBasedHome() {
  const role = useRole();
  return (
    <>
      <Show when="signed-out"><Redirect to="/sign-in" /></Show>
      <Show when="signed-in">
        {role === "client" ? <Redirect to="/client/dashboard" /> :
         role === "sales_executive" ? <Redirect to="/sales/dashboard" /> :
         <Redirect to="/dashboard" />}
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component, roles }: { component: React.ComponentType; roles?: string[] }) {
  const role = useRole();
  return (
    <>
      <Show when="signed-in">
        <Layout>
          <Component />
        </Layout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <Switch>
          <Route path="/" component={RoleBasedHome} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />

          {/* Main CRM */}
          <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
          <Route path="/leads"><ProtectedRoute component={Leads} /></Route>
          <Route path="/leads/:id"><ProtectedRoute component={LeadDetail} /></Route>
          <Route path="/customers"><ProtectedRoute component={Customers} /></Route>
          <Route path="/properties"><ProtectedRoute component={Properties} /></Route>
          <Route path="/tasks"><ProtectedRoute component={Tasks} /></Route>
          <Route path="/pipeline"><ProtectedRoute component={Pipeline} /></Route>
          <Route path="/payments"><ProtectedRoute component={Payments} /></Route>

          {/* Admin */}
          <Route path="/admin/users"><ProtectedRoute component={AdminUsers} /></Route>
          <Route path="/admin/assign-leads"><ProtectedRoute component={AssignLeads} /></Route>

          {/* Sales */}
          <Route path="/sales/dashboard"><ProtectedRoute component={SalesDashboard} /></Route>
          <Route path="/sales/leads"><ProtectedRoute component={SalesLeads} /></Route>

          {/* Client Portal */}
          <Route path="/client/dashboard"><ProtectedRoute component={ClientDashboard} /></Route>
          <Route path="/client/payments"><ProtectedRoute component={ClientPayments} /></Route>
          <Route path="/client/properties"><ProtectedRoute component={ClientProperties} /></Route>

          <Route component={NotFound} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
