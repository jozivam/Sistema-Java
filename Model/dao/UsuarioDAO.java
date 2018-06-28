package Model.dao;

import Connection.connectionBancoDados;
import Model.bean.Usuario;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.logging.Level;
import java.util.logging.Logger;

public class UsuarioDAO {

    public boolean checkLogin(String login, String senha) {//CLASSE RESPONSAVEL PELA LEITURA DOS DADOS
        Connection con = connectionBancoDados.getConnection();
        PreparedStatement stmt = null;
        ResultSet rs = null;
        boolean check = false;//login e senha incializa

        try {
            stmt = con.prepareStatement("SELECT * FROM user WHERE login = ? and senha = ?");
            stmt.setString(1, login);
            stmt.setString(2, senha);
            //posso tentar aqui tentar conpara o nome do usuario e setar no loby do sistema
//            stmt.executeQuery();//faz consulta noo banco
            rs = stmt.executeQuery();//faz consulta noo banco e coloca no resultSet

            if (rs.next()) {//vai pular na lista ate achar login e senha conpativeis
                check = true;
            }
        } catch (SQLException ex) {
            Logger.getLogger(UsuarioDAO.class.getName()).log(Level.SEVERE, null, ex);
        } finally {
            connectionBancoDados.closeConnetion(con, stmt, rs);
        }

        return check;
    }

}
