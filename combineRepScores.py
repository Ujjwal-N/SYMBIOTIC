#folderNames = ['15', '25', '35']
import matplotlib.pyplot as plt
import numpy as np
from labellines import labelLine, labelLines

folderNames = ['15']
# maliciousPercentage -> 20,60,100 -> 0*n...6*n actions->parisitic, average, altruistic
repDists = np.array([[[[0 for l in range(3)] for k in range(7)]
                      for j in range(3)] for i in folderNames])
xVals = [i * 5 for i in range(0, 7)]
totalActions = 0

for f in range(len(folderNames)):
    for n in range(3):
        for foldNum in range(1, 11):
            with open(f"experiments/{folderNames[f]}/{n * 40 + 20}-{foldNum}-repScores.csv") as fl:
                entryNum = 0
                for line in fl.readlines():
                    currEntry = [float(i) for i in line.strip().split(",")]
                    repDists[f][n][entryNum] = [
                        currEntry[1], currEntry[2], currEntry[3]] + repDists[f][n][entryNum]
                    entryNum += 1
        for entryNum in range(7):
            repDists[f][n][entryNum] = repDists[f][n][entryNum] / 10.0

# 9 lines per malPercentage
# 3 different colors: red, blue, green
parisiticLines = [[[] for j in range(3)] for i in folderNames]
averageLines = [[[] for j in range(3)] for i in folderNames]
altruisticLines = [[[] for j in range(3)] for i in folderNames]

for f in range(len(folderNames)):
    for n in range(3):
        parisiticLines[f][n] = repDists[f][n].T[0]
        averageLines[f][n] = repDists[f][n].T[1]
        altruisticLines[f][n] = repDists[f][n].T[2]

# print(parisiticLines)
# print(averageLines)
# print(altruisticLines)

fig = plt.figure(figsize=(9, 6))
ax = fig.add_axes([0.1, 0.1, 0.85, 0.85])
ax.set_title('Average Reputation Score vs Number of Actions')
ax.set_xlabel('Number of Actions')
ax.set_ylabel('Average Reputation Score')

lineSets = [altruisticLines, averageLines, parisiticLines]
colors = ["green", "blue", "red"]
signs = [1, -1, 1]
for i in range(3):
    cLineSet = lineSets[i]
    for f in range(len(folderNames)):
        offsets = [75, 140, 195]
        for n in range(3):
            a, b = np.polyfit(xVals[1:], cLineSet[f][n][1:], 1)
            scat1 = ax.scatter(xVals, cLineSet[f][n], color=colors[i])
            ax.plot(np.array(xVals), a * np.array(xVals) + b, color=colors[i])
            allLines = ax.get_lines()
            labelLine(allLines[-1], 22, label=f"p={folderNames[f]}%,n={n * 40 + 20}",
                      yoffset=offsets[n] * signs[i], fontsize=5, backgroundcolor="none")
# ax1.text(20, 222, 'y = ' + '{:.2f}'.format(b1) +
#          ' + {:.2f}'.format(a1) + 'x',)
# ax1.text(20, 207, "Pearson's correlation coefficient = " +
#          '{:.4f}'.format(np.corrcoef(xVals, totalActionTimes)[0][1]))

plt.show()
