import json
import os

class FakeDB:
    def __init__(self):
        self.arquivo = "usuarios.json"

        if not os.path.exists(self.arquivo):
            with open(self.arquivo, 'w') as f:
                json.dump([], f)

                def ler_usuarios(self):
                    with open(self.arquivo, 'r') as f:
                        return json.load(f)
                    
        def salvar_usuario(self, usuario):
            usuarios = self.ler_usuarios()
            usuarios.append(usuario)
            with open(self.arquivo, 'w') as f:
                json.dump(usuarios, f, indent=4)

                def buscar_usuario(self, email):
                    usuarios = self.ler_usuarios()
                    for usuario in usuarios:
                        if usuario['email'] == email:
                            return usuario
                    return None