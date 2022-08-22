import matplotlib
import matplotlib.pyplot as plt
import numpy as np

folderNames = [35]
totalNs = 5
totalFolds = 10

finalArray = np.array([[[0.0 for _ in range(7)]
                      for _ in range(3)] for _ in folderNames])
xVals = [i * 5 for i in range(0, 7)]
totalActions = 0

for f in range(len(folderNames)):
    for n in range(totalNs):
        tempMatrix = np.array([[0.0 for _ in range(3)] for _ in range(7)])
        for foldNum in range(1, totalFolds + 1):
            with open(f"../../hardhat/REUProj/experiments/{folderNames[f]}/{n * 20 + 20}-{foldNum}-repScores.csv") as fl:
                entryNum = 0
                for line in fl.readlines():
                    currEntry = [
                        float(i) for i in line.strip().split(",")]
                    for j in range(1, 4):
                        tempMatrix[entryNum][j -
                                             1] += currEntry[j] / totalFolds
                    entryNum += 1
        finalArray[f] += tempMatrix.T / totalNs


fig = plt.figure()
fig.set_size_inches(w=4.7747, h=3.5)
ax = fig.add_axes([0.15, 0.15, 0.8, 0.8])
ax.set_xlabel('Number of Actions')
ax.set_ylabel('Average Reputation Score')

colors = ["red", "green", "blue"]
lines = []
for dNum, malPer in enumerate(folderNames):
    for linNum in range(3):
        a, b = np.polyfit(xVals[1:], finalArray[dNum][linNum][1:], 1)
        scat1 = ax.scatter(
            xVals, finalArray[dNum][linNum], color=colors[linNum])
        lines.append(ax.plot(np.array(xVals), a *
                     np.array(xVals) + b, color=colors[linNum])[0])

ax.legend(lines[::-1], ["Parisitic", "Average", "Altruistic"][::-1])


# matplotlib.use("pgf")
# matplotlib.rcParams.update({
#     "pgf.texsystem": "pdflatex",
#     'font.family': 'serif',
#     'text.usetex': True,
#     'pgf.rcfonts': False,
# })
# plt.savefig('15.pgf')
fig.savefig(f"{folderNames[0]}.pdf", bbox_inches='tight')
plt.show()
