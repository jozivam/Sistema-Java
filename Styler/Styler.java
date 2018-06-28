package Styler;

import java.awt.Color;
import java.awt.Frame;

public class Styler {
    //PACOTE RESPONSAVEL POR ESTILIZAR A PAGINA
    
    public void tranaparente(Frame frame){
        frame.setUndecorated(true);
        frame.setBackground(new Color(0,0,0,0));//DA TRANPARENCIA PARA O FRAME DEIZANDO SO A IMAGEM
        frame.setBackground(new Color(0,0,0,0));
    }
    
    
}
