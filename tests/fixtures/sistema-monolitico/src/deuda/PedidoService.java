package deuda;

public class PedidoService {
    private InventarioService inventarioService;

    public PedidoService() {
        this(true);
    }

    PedidoService(boolean configurarDependencias) {
        if (configurarDependencias) {
            this.inventarioService = new InventarioService(this);
        }
    }

    public String prepararPedido(String cliente, int cantidad) {
        if (inventarioService == null) {
            return "Pedido sin inventario";
        }
        return inventarioService.reservar(cliente, cantidad);
    }

    public InventarioService getInventarioService() {
        return inventarioService;
    }
}
