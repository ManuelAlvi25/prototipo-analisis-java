package deuda;

public class Main {
    public static void main(String[] args) {
        SistemaMonolitico sistema = new SistemaMonolitico();
        System.out.println(sistema.procesarSolicitud("ana", "COMPRA", 3, 4));
        System.out.println(sistema.generarFactura("ana", 59.97, true));
        sistema.exportarAuditoria("CSV");
    }
}
