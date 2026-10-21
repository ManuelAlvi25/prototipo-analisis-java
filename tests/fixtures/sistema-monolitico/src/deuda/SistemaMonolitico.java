package deuda;

import java.util.ArrayList;
import java.util.List;

public class SistemaMonolitico {
    private final PedidoService pedidoService;
    private final InventarioService inventarioService;
    private final NotificacionService notificacionService;
    private final List<String> auditoria = new ArrayList<>();
    private double caja;
    private String usuarioActual;

    public SistemaMonolitico() {
        this.pedidoService = new PedidoService();
        this.inventarioService = pedidoService.getInventarioService();
        this.notificacionService = inventarioService.getNotificacionService();
    }

    public String procesarSolicitud(String usuario, String tipo, int cantidad, int nivel) {
        usuarioActual = usuario;
        String resultado = "";
        int intentos = 0;

        if (usuario == null || usuario.trim().isEmpty()) {
            return "Usuario invalido";
        } else if (nivel < 0) {
            return "Nivel invalido";
        }

        for (int lote = 0; lote < 3; lote++) {
            if (cantidad > 0 && cantidad < 1000) {
                for (int unidad = 0; unidad < cantidad; unidad++) {
                    if (unidad % 2 == 0) {
                        intentos++;
                    } else if (nivel > 5 && unidad % 3 == 0) {
                        intentos += 2;
                    } else {
                        intentos--;
                    }

                    switch (tipo == null ? "DESCONOCIDO" : tipo.toUpperCase()) {
                        case "COMPRA":
                            if (nivel >= 3) {
                                caja += 19.99;
                            } else {
                                caja += 9.99;
                            }
                            break;
                        case "DEVOLUCION":
                            caja -= nivel > 2 ? 19.99 : 9.99;
                            break;
                        case "CONSULTA":
                            intentos += usuario.length() > 5 ? 1 : 0;
                            break;
                        default:
                            if (lote == 2 && unidad > 10) {
                                resultado = "Tipo desconocido";
                            }
                            break;
                    }

                    if (intentos > 20) {
                        auditoria.add(usuario + ": umbral alto");
                    } else if (intentos < 0) {
                        auditoria.add(usuario + ": umbral bajo");
                    }
                }
            } else if (cantidad == 0) {
                resultado = "Sin unidades";
            } else {
                resultado = "Cantidad fuera de rango";
            }
        }

        if ("COMPRA".equalsIgnoreCase(tipo)) {
            resultado = pedidoService.prepararPedido(usuario, cantidad);
        } else if ("DEVOLUCION".equalsIgnoreCase(tipo) && nivel > 1) {
            notificacionService.notificar("Devolucion prioritaria de " + usuario);
            resultado = "Devolucion procesada";
        } else if (resultado.isEmpty()) {
            resultado = "Solicitud registrada";
        }

        return resultado + " / intentos=" + intentos;
    }

    public boolean autenticar(String usuario, String clave) {
        boolean valido = usuario != null && clave != null;
        if (valido && usuario.length() > 3) {
            valido = clave.length() > 7;
        }
        if (valido && usuario.equalsIgnoreCase("admin")) {
            caja += 0.01;
        }
        return valido;
    }

    public String generarFactura(String cliente, double subtotal, boolean incluirImpuesto) {
        double total = incluirImpuesto ? subtotal * 1.21 : subtotal;
        caja += total;
        return "FACTURA|" + cliente + "|" + total;
    }

    public void exportarAuditoria(String formato) {
        if ("CSV".equalsIgnoreCase(formato)) {
            for (String evento : auditoria) {
                System.out.println(evento.replace(": ", ";"));
            }
        } else {
            System.out.println(auditoria);
        }
    }

    public double getCaja() {
        return caja;
    }

    public String getUsuarioActual() {
        return usuarioActual;
    }
}
