import type { LibraryListResult } from "@contracts/library-public";
import "./library-table.css";

interface LibraryTableProps {
	readonly data: LibraryListResult;
	readonly onVerify: (libraryId: string) => void;
}

export function LibraryTable({ data, onVerify }: LibraryTableProps) {
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
							<th>Email</th>
							<th>Status</th>
							<th />
						</tr>
					</thead>
					<tbody>
						{data.libraries.map((library) => (
							<tr key={library.id}>
								<td>{library.name}</td>
								<td>{library.email}</td>
								<td>
									<span
										className={
											library.authenticationStatus === "authenticated"
												? "status-badge status-authenticated"
												: "status-badge status-unauthenticated"
										}
									>
										{library.authenticationStatus}
									</span>
								</td>
								<td>
									{library.authenticationStatus === "unauthenticated" && (
										<button
											type="button"
											className="verify-button"
											onClick={() => onVerify(library.id)}
										>
											Verify
										</button>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}
