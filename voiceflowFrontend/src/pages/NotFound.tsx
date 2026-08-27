import { Link, useLocation } from "react-router-dom";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const { pathname } = useLocation();

  return (
    <Layout>
      <div className="container mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center py-16">
        <p className="label-caps">Error 404</p>
        <h1 className="mt-2 text-3xl font-bold">This page does not exist</h1>
        <p className="mt-3 text-muted-foreground">
          Nothing is routed at{" "}
          <code className="font-mono text-sm">{pathname}</code>.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/">Go to the overview</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/b2b">Open a console</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
