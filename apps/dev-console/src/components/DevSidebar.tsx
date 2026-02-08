import { Link } from "@tanstack/react-router";
import "./DevSidebar.css";

export default function DevSidebar() {
	return (
		<aside className="dev-sidebar">
			<div className="dev-sidebar-header">
				<h2 className="dev-sidebar-brand">Dev Console</h2>
			</div>
			<nav className="dev-sidebar-nav">
				<Link
					to="/"
					className="dev-nav-link"
					activeProps={{ className: "active" }}
				>
					Dashboard
				</Link>
			</nav>
		</aside>
	);
}
