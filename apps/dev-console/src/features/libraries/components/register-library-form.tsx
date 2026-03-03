import "./register-library-form.css";

interface RegisterLibraryFormProps {
	readonly onSubmit: (data: { name: string; email: string }) => void;
	readonly isPending: boolean;
}

export function RegisterLibraryForm({
	onSubmit,
	isPending,
}: RegisterLibraryFormProps) {
	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const name = formData.get("name") as string;
		const email = formData.get("email") as string;
		onSubmit({ name, email });
	};

	return (
		<div className="register-form-card">
			<h2 className="register-form-title">Register Library</h2>
			<p className="register-form-description">
				Enter the library name and email address.
			</p>
			<form onSubmit={handleSubmit} className="register-form">
				<div className="form-field">
					<label htmlFor="name" className="form-label">
						Library Name
					</label>
					<input
						id="name"
						name="name"
						className="form-input"
						placeholder="Central Library"
						required
					/>
				</div>
				<div className="form-field">
					<label htmlFor="email" className="form-label">
						Email
					</label>
					<input
						id="email"
						name="email"
						type="email"
						className="form-input"
						placeholder="library@example.com"
						required
					/>
				</div>
				<button type="submit" className="form-submit" disabled={isPending}>
					{isPending ? "Registering..." : "Register"}
				</button>
			</form>
		</div>
	);
}
