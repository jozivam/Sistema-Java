package Model.dao;

import Connection.connectionBancoDados;
import Model.bean.Produto;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.swing.JOptionPane;
import java.lang.NullPointerException;



public class produtoDAO {
//SALVAR
    public void SAVE(Produto pro){
            
        Connection con = connectionBancoDados.getConnection(); //abre conexão
        PreparedStatement stmt = null;
        
        try {
            stmt = con.prepareStatement("INSERT INTO produto(produto,valor,quantidade) VALUES(?,?,?)");
            stmt.setString(1, pro.getProduto());
            stmt.setDouble(2, pro.getValor());
            stmt.setInt(3, pro.getQuantidade());
            
            stmt.executeUpdate();
//            JOptionPane.showMessageDialog(null, "Salvo!");
        } catch (SQLException ex) {
            JOptionPane.showMessageDialog(null, "Erro ProdutoDAO! ");
        }finally{
            connectionBancoDados.closeConnetion(con, stmt);
        }
        
    }
//LER   
    public List<Produto> READ(){
        Connection con = connectionBancoDados.getConnection();
        PreparedStatement stmt = null;
        ResultSet rs = null;
        
        List<Produto> produtos = new ArrayList<>();
        
        try {
            stmt = con.prepareStatement("SELECT * FROM produto");
//            stmt.executeQuery();//faz consulta noo banco
            rs = stmt.executeQuery();//faz consulta noo banco e coloca no resultSet
                
                while(rs.next()){
                    Produto pro = new Produto();
                   
                    pro.setId(rs.getInt("id"));
                    pro.setProduto(rs.getString("produto"));
                    pro.setValor(rs.getDouble("valor"));
                    pro.setQuantidade(rs.getInt("quantidade"));
                    produtos.add(pro);
                }
                    
                    } catch (SQLException ex) {
            Logger.getLogger(produtoDAO.class.getName()).log(Level.SEVERE, null, ex);
        }finally{
            connectionBancoDados.closeConnetion(con, stmt, rs);
        }
        
        return produtos;
    }
//PESQUISAR   
    public List<Produto> SEARCH(String produto){//Pesquisar
        Connection con = connectionBancoDados.getConnection();
        PreparedStatement stmt = null;
        ResultSet rs = null;
        
        List<Produto> produtos = new ArrayList<>();
        
        try {
            stmt = con.prepareStatement("SELECT * FROM produto WHERE produto LIKE ?");
            stmt.setString(1, "%"+produto+"%");
            rs = stmt.executeQuery();//faz consulta noo banco e coloca no resultSet
                
                while(rs.next()){
                    Produto pro = new Produto();
                    
                    pro.setId(rs.getInt("id"));
                    pro.setProduto(rs.getString("produto"));
                    pro.setValor(rs.getDouble("valor"));
                    pro.setQuantidade(rs.getInt("quantidade"));
                    produtos.add(pro);
                }
                    
                    } catch (SQLException ex) {
            Logger.getLogger(produtoDAO.class.getName()).log(Level.SEVERE, null, ex);
        }finally{
            connectionBancoDados.closeConnetion(con, stmt, rs);
        }
        
        return produtos;
    }
//PEGAR ITEM 
    public List<Produto> RST(String produto){//Pesquisar
        Connection con = connectionBancoDados.getConnection();
        PreparedStatement stmt = null;
        ResultSet rs = null;
        
        List<Produto> produtos = new ArrayList<>();
        
        try {
            stmt = con.prepareStatement("SELECT id, produto, quantidade, valor FROM produto WHERE produto=?");
            stmt.setObject(1, produto);
           
            
            rs = stmt.executeQuery();//faz consulta noo banco e coloca no resultSet
                
                while(rs.next()){
                    Produto pro = new Produto();
                    
                    pro.setId(rs.getInt(1));
                    pro.setProduto(rs.getString(2));
                    pro.setValor(rs.getDouble(3));
                    pro.setQuantidade(rs.getInt(4));
                    produtos.add(pro);
                }
                    
        } catch (SQLException ex) {
            Logger.getLogger(produtoDAO.class.getName()).log(Level.SEVERE, null, ex);
        }finally{
            connectionBancoDados.closeConnetion(con, stmt, rs);
        }
        
        return produtos;
    }
    
    
//ATUALIZAR   
    public void UPDATE(Produto pro){
            
        Connection con = connectionBancoDados.getConnection(); //abre conexão
        PreparedStatement stmt = null;
        
        try {
            stmt = con.prepareStatement("UPDATE produto SET produto = ?,valor = ?,quantidade = ? WHERE id = ?");
            stmt.setString(1, pro.getProduto());
            stmt.setInt(2, pro.getQuantidade());
            stmt.setDouble(3, pro.getValor());
            stmt.setInt(4, pro.getId());
            
            stmt.executeUpdate();
            JOptionPane.showMessageDialog(null, "Atuazidado com sucesso!!");
        } catch (SQLException ex) {
            JOptionPane.showMessageDialog(null, "Erro ao Atualizar! "+ex );
        }finally{
            connectionBancoDados.closeConnetion(con, stmt);
        }
        
    }                
//DELETAR
    public void DELETE(Produto pro){
            
        Connection con = connectionBancoDados.getConnection(); //abre conexão
        PreparedStatement stmt = null;
        
        try {
            stmt = con.prepareStatement("DELETE FROM produto WHERE id = ?");
            stmt.setInt(1, pro.getId());
            
            stmt.executeUpdate();
            JOptionPane.showMessageDialog(null, "DELETADO com sucesso!!");
        } catch (SQLException ex) {
            JOptionPane.showMessageDialog(null, "Erro ao DELETAR! "+ex );
        }finally{
            connectionBancoDados.closeConnetion(con, stmt);
        }
        
    }   
//CHECA SE EXISTE    
    public boolean CHECKPRODUTO(String produto) {//CLASSE RESPONSAVEL PELA LEITURA DOS DADOS
        Connection con = connectionBancoDados.getConnection();//abrindo conexão
        PreparedStatement stmt = null;
        ResultSet rs = null;
        boolean check = false;//inicializar produto

        try {
            stmt = con.prepareStatement("SELECT * FROM produto WHERE produto = ?");
//            stmt.setString(0, id);
            stmt.setString(1, produto);
            //posso tentar aqui tentar conpara o nome do usuario e setar no loby do sistema
//            stmt.executeQuery();//faz consulta noo banco
            rs = stmt.executeQuery();//faz consulta noo banco e coloca no resultSet

            if (rs.next()) {//vai pular na lista ate achar login e senha conpativeis
                check = true;
            }
        } catch (SQLException ex) {
            Logger.getLogger(produtoDAO.class.getName()).log(Level.SEVERE, null, ex);
        } finally {
            connectionBancoDados.closeConnetion(con, stmt, rs);
        }

        return check;
    }
    
   
    
}
