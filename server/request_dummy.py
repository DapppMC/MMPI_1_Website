import requests
import json

# URL Server API Anda
url = "http://127.0.0.1:8000/process-mmpi"

# 1. DATA REQUEST DUMMY
# List jawaban dummy yang di request ke server

# Langkah : 1.Isi dummy_answers dengan all True/ all False telebih dahulu
#           2.Isi jawaban_edit dengan list jawaban yang ingin diubah (diubah dengan sebaliknya) -> dummy_answer : True ; jawaban_edit : False
#           3.Jangan lupa ganti dummy_answers[n-1] = False/True (berlawanan sama dummy_answers)

# Contoh : dummy answers = True
#          jawaban_edit = [1, 5, 10, 70, 150, 190, 280, 395, 566]
#          Set dummy_answers[n-1] = False (untuk mengubah jawaban_edit menjadi false)
answer_logic = False

dummy_answers = [answer_logic] * 566 

#Bisa di command kalo nggak dipake

###
jawaban_edit = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 29, 38, 42, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165, 170, 175, 180, 185, 190, 195, 200, 205, 210, 215, 220, 225, 230, 235, 240, 245, 250, 255, 260, 265, 270, 275, 280, 285, 290, 295, 300, 305, 310, 315, 320, 325, 330, 335, 340, 345, 350, 355, 360, 365, 370, 375, 380, 385, 390, 395, 400, 405, 410, 415, 420, 425, 430, 435, 440, 445, 450, 455, 460, 465, 470, 475, 480, 485, 490, 495, 500, 505, 510, 515, 520, 525, 530, 535, 540, 545, 550, 555, 560]

#Set To False Jika ingin jawaban_edit = False, True Jika ingin jawaban_edit = True

for n in jawaban_edit:
    dummy_answers[n-1] = not answer_logic #False/True (berlawanan sama dummy_answers)
###

payload = {
    "gender": "Female", #Male/Female, bisa diganti sesuai yang diinginkan
    "answers": dummy_answers
}

try:
    print(f"Mengirim request ke {url}...")
    
    # Kirim ke Server
    response = requests.post(url, json=payload)
    
    # Cek Hasil
    if response.status_code == 200:
        print("\n[OK] SUKSES! Hasil Skor:")
        print(json.dumps(response.json(), indent=2))
    else:
        # Jika Server Error (Misal Tesseract tidak ketemu atau DOSBox crash)
        print(f"\n[X] GAGAL (Status {response.status_code}):")
        print("Pesan Error:", response.text)
        
except Exception as e:
    print(f"\n[!] Error Koneksi: {e}")
    print("Pastikan file server.py sudah berjalan (uvicorn server:app --reload)")