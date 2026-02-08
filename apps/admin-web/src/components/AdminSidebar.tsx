import { Link } from "@tanstack/react-router";
import "./AdminSidebar.css";

export default function AdminSidebar() {
	return (
		<aside className="admin-sidebar">
			<div className="admin-sidebar-header">
				<h2 className="admin-sidebar-brand">Admin</h2>
			</div>
			<nav className="admin-sidebar-nav">
				<Link
					to="/"
					className="admin-nav-link"
					activeProps={{ className: "active" }}
				>
					Dashboard
				</Link>
			</nav>
		</aside>
	);
}
