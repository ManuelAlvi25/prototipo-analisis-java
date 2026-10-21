package util;

public final class Formatos {
    private Formatos() {
    }

    public static String formatear(String texto) {
        return texto.trim();
    }

    public static dominio.Cliente clienteVacio() {
        return new dominio.Cliente();
    }
}
