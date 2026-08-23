import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "../../context/AuthProvider";
import { LoginForm } from "./LoginForm";

function renderLoginForm() {
  return render(
    <AuthProvider>
      <LoginForm />
    </AuthProvider>,
  );
}

describe("<LoginForm />", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("muestra un error accesible cuando las credenciales son inválidas", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("stack trace de Java, no JSON", { status: 401 })),
    );

    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByLabelText("Correo"), "d@x.com");
    await user.type(screen.getByLabelText("Contraseña"), "mala-clave");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Correo o contraseña incorrectos.");
  });

  it("no muestra el formulario de login una vez autenticado (App.tsx cambia de pantalla)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 1, name: "Daihana", email: "d@x.com" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByLabelText("Correo"), "d@x.com");
    await user.type(screen.getByLabelText("Contraseña"), "buena-clave");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    // El propio LoginForm no se desmonta a sí mismo (eso lo hace App.tsx al
    // leer isAuthenticated), pero sí debe dejar de mostrar el botón "Entrar"
    // en estado de carga y no debe quedar ningún error visible tras éxito.
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
});
