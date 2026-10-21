package deuda;

public class NotificacionService {
    private final InventarioService inventarioService;
    private final PedidoService pedidoService;

    public NotificacionService(InventarioService inventarioService, PedidoService pedidoService) {
        this.inventarioService = inventarioService;
        this.pedidoService = pedidoService;
    }

    public void notificar(String mensaje) {
        System.out.println("NOTIFICACION: " + mensaje);
    }

    public PedidoService crearPedidoAlternativo() {
        return new PedidoService(false);
    }

    public InventarioService getInventarioService() {
        return inventarioService;
    }

    public PedidoService getPedidoService() {
        return pedidoService;
    }
}
