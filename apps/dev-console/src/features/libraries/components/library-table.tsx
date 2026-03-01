import type { LibraryListResult } from "@contracts/library-public";
import "./library-table.css";

interface LibraryTableProps {
	readonly data: LibraryListResult;
}

export function LibraryTable({ data }: LibraryTableProps) {
	return (
		<div className="library-list">
			<h1>Libraries</h1>
			<p className="library-list-description">
				{data.total} library(ies) registered
			</p>

			{data.total === 0 ? (
				<div className="library-empty">
					<p>No libraries registered yet.</p>
				</div>
			) : (
				<table className="library-table">
					<thead>
						<tr>
							<th>Name</th>
							<th>Location</th>
						</tr>
					</thead>
					<tbody>
						{data.libraries.map((library) => (
							<tr key={library.id}>
								<td>{library.name}</td>
								<td>{library.location}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}
