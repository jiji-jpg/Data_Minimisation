from flask import Flask, render_template

app = Flask(__name__, template_folder="../Frontend/pages")

@app.get("/")
def home():
    return render_template("index.html")

@app.get("/data_minimisation")
def data_minimisation():
    return render_template("data_minimisation.html")

@app.get("/report")
def report():
    return render_template("report.html")

@app.get("/privacyNotice")
def q_privacyNotice():
    return render_template("q_privacyNotice.html")

@app.get("/backgroundCheck")
def q_backgroundCheck():
    return render_template("q_backgroundCheck.html")

if __name__ == "__main__":
    app.run(debug=True)
