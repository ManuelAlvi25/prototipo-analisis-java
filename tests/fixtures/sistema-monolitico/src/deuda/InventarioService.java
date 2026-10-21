package deuda;

public class InventarioService {
    private final PedidoService pedidoService;
    private final NotificacionService notificacionService;
    private int existencias = 20;

    public InventarioService(PedidoService pedidoService) {
        this.pedidoService = pedidoService;
        this.notificacionService = new NotificacionService(this, pedidoService);
    }

    public String reservar(String cliente, int cantidad) {
        if (cantidad <= 0) {
            return "Cantidad invalida";
        }
        if (existencias >= cantidad) {
            existencias -= cantidad;
            notificacionService.notificar("Reserva para " + cliente);
            return "Reserva confirmada";
        }
        notificacionService.notificar("Sin stock para " + cliente);
        return "Reserva rechazada";
    }

    public PedidoService getPedidoService() {
        return pedidoService;
    }

    public NotificacionService getNotificacionService() {
        return notificacionService;
    }
}
