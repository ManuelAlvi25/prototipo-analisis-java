package app;

import dominio.*;
import static util.Formatos.formatear;

public class Aplicacion {
    private Pedido pedidoActual;

    public void ejecutar() {
        var cliente = new Cliente();
        String texto = formatear(cliente.getNombre());
        System.out.println(texto);
    }

    public static void registrar(Pedido pedido) {
        System.out.println("Registrado: " + pedido);
    }
}
