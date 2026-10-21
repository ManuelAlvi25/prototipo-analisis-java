package dominio;

import java.util.ArrayList;
import java.util.List;
import app.Aplicacion;

public class Pedido {
    private final List<Linea> lineas = new ArrayList<>();
    private Cliente cliente;

    static class Linea {
        int cantidad;
    }

    public <T extends Comparable<T>> T mayor(T a, T b) {
        return a.compareTo(b) >= 0 ? a : b;
    }

    public void confirmar() {
        Aplicacion.registrar(this);
    }
}
