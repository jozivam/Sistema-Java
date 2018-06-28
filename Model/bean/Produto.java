package Model.bean;

import com.sun.xml.internal.bind.v2.runtime.RuntimeUtil;

public class Produto {
    
    private int id;
    private String produto;
    private double valor;
    private int quantidade;



    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getProduto() {
        return produto;
    }

    public void setProduto(String produto) {
        this.produto = produto;
    }

    public double getValor() {
        return valor;
    }

    public void setValor(double valor) {
        this.valor = valor;
    }

    public int getQuantidade() {
        return quantidade;
    }

    public void setQuantidade(int quantidade) {
        this.quantidade = quantidade;
    }
    

    @Override
    public String toString() {
        return getProduto();
    }
    public Object getId(String id) {
        return getId();
    }
    public String getProduto(String produto) {
        return getProduto();
    }
    public Object getQuantidade(String quantidade) {
        return getQuantidade();
    }
    public Object getValor(String valor) {
        return getValor();
    }

    public void add(Produto p) {
        throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
    }

    

   
    
    
    
}
