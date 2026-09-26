import { ClientApp } from "./ClientApp";

// Every non-API URL (/, /login, /admin/login, /app/...) is handled client-side
// by the React Router app that used to be the Vite frontend.
export default function Page() {
    return <ClientApp />;
}
