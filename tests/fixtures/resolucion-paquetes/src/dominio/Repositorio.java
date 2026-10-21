package dominio;

public interface Repositorio<E> {
    E buscar(String id);
}
