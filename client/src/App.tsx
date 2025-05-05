import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import Clients from "@/pages/clients";
import Affiliates from "@/pages/affiliates";
import Others from "@/pages/others";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

function Router() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="relative flex-1 overflow-y-auto focus:outline-none">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/projects" component={Projects} />
            <Route path="/clients" component={Clients} />
            <Route path="/affiliates" component={Affiliates} />
            <Route path="/others" component={Others} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
