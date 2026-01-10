from flask import Flask, render_template

app = Flask(__name__, template_folder="../Frontend/pages")



@app.get("/privacyNotice")
def q_privacyNotice():
    return render_template("q_privacyNotice.html")

@app.get("/backgroundCheck")
def q_backgroundCheck():
    return render_template("q_backgroundCheck.html")

if __name__ == "__main__":
    app.run(debug=True)
