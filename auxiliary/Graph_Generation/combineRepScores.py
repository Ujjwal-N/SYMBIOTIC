# folderNames = ['15', '25', '35']
import matplotlib.pyplot as plt
import numpy as np
from labellines import labelLine, labelLines

folderNames = [15, 25, 35]
totalNs = 5
totalFolds = 10
# maliciousPercentage -> 20...100 -> foldNum ->0*n...6*n actions->parisitic, average, altruistic
repDists = np.array([[[[[0.0 for _ in range(4)] for _ in range(7)] for _ in range(totalFolds)]
                      for _ in range(totalNs)] for _ in folderNames])
xVals = [i * 5 for i in range(0, 7)]
totalActions = 0

for f in range(len(folderNames)):
    for n in range(totalNs):
        for foldNum in range(1, totalFolds + 1):
            with open(f"REUProj/experiments/{folderNames[f]}/{n * 20 + 20}-{foldNum}-repScores.csv") as fl:
                entryNum = 0
                for line in fl.readlines():
                    currEntry = [
                        float(i) if i != "NaN" else float("inf") for i in line.strip().split(",")]
                    for j in range(1, 5):
                        repDists[f][n][foldNum -
                                       1][entryNum][j - 1] = currEntry[j]
                    entryNum += 1

# 9 lines per malPercentage
# 3 different colors: red, blue, green
parisiticLines = [[[]
                   for _ in range(totalNs * totalFolds)] for _ in folderNames]
averageLines = [[[] for _ in range(totalNs * totalFolds)] for _ in folderNames]
altruisticLines = [[[]
                    for _ in range(totalNs * totalFolds)] for _ in folderNames]
validatedRequestsLine = [
    [[] for _ in range(totalNs * totalFolds)] for _ in folderNames]

for f in range(len(folderNames)):
    for n in range(totalNs):
        for r in range(totalFolds):
            print(repDists[f][n][r])
            print()
            parisiticLines[f][n * totalFolds + r] = repDists[f][n][r].T[0]
            averageLines[f][n * totalFolds + r] = repDists[f][n][r].T[1]
            altruisticLines[f][n * totalFolds + r] = repDists[f][n][r].T[2]
            validatedRequestsLine[f][n * totalFolds +
                                     r] = repDists[f][n][r].T[3]


fig = plt.figure(figsize=(9, 6))
ax = fig.add_axes([0.1, 0.1, 0.85, 0.85])
ax.set_title('Average Reputation Score vs Number of Actions')
ax.set_xlabel('Number of Actions')
ax.set_ylabel('Average Reputation Score')

lineSets = [parisiticLines, altruisticLines, averageLines]
#colors = [["lightcoral", "indianred", "brown"], ["skyblue" for _ in range(3)], ["darkgreen","green", "lightgreen"]]
colors = [["red" for _ in range(3)], ["blue" for _ in range(3)], [
    "green" for _ in range(3)]]
for i in range(3):
    cLineSet = lineSets[i]
    for f in range(len(folderNames)):
        for n in range(len(cLineSet[f])):
            a, b = np.polyfit(xVals[1:], cLineSet[f][n][1:], 1)

            scat1 = ax.scatter(
                xVals, cLineSet[f][n], color=colors[i][f])
            ax.plot(np.array(xVals), a * np.array(xVals) +
                    b, color=colors[i][f])

# ax.legend([ax.lines[0], ax.lines[100], ax.lines[200]],
#           ["Parisitic Nodes, Distribution 1", "Altruistic Nodes, Distribution 1", "Average Nodes, Distribution 1"])
plt.show()
