#folderNames = ['15', '25', '35']
import matplotlib.pyplot as plt
import numpy as np

folderNames = ['15']
xVals = []
totalActionTimes = []
averageActionTimes = []
totalActions = 0

for name in folderNames:
    for numNodes in range(20, 120, 20):
        for foldNum in range(1, 11):
            currTotal = 0
            with open(f"experiments/{name}/{numNodes}-{foldNum}-timestamps.csv") as f:
                for line in f.readlines():
                    currTotal += float(line.strip()) / 1000 / 60
                    totalActions += 1
            xVals.append(numNodes)
            totalActionTimes.append(currTotal)
            averageActionTimes.append(currTotal / numNodes / 30 * 60)

fig = plt.figure(figsize=(6, 8))

ax1 = fig.add_axes([0.15, 0.1, 0.7, 0.35])
ax1.set_title('Total Simulation Time (min) vs Number of Nodes')
ax1.set_xlabel('Number of Nodes')
ax1.set_ylabel('Total Simulation Time (min)')

a1, b1 = np.polyfit(xVals, totalActionTimes, 1)
scat1 = ax1.scatter(xVals, totalActionTimes)

ax1.plot(np.array(xVals), a1 * np.array(xVals) + b1)
ax1.text(20, 222, 'y = ' + '{:.2f}'.format(b1) +
         ' + {:.2f}'.format(a1) + 'x',)
ax1.text(20, 207, "Pearson's correlation coefficient = " +
         '{:.4f}'.format(np.corrcoef(xVals, totalActionTimes)[0][1]))

ax2 = fig.add_axes([0.15, 0.6, 0.7, 0.35])
ax2.set_title('Average Action Time (sec) vs Number of Nodes')
ax2.set_xlabel('Number of Nodes')
ax2.set_ylabel('Average Action Time (sec)')

a2, b2 = np.polyfit(np.log(np.array(xVals)), np.array(averageActionTimes), 1)
scat2 = ax2.scatter(xVals, averageActionTimes)

ax2.plot(np.array(xVals), a2 * np.log(np.array(xVals)) + b2)
ax2.text(20, 4.6, 'y = ' + '{:.2f}'.format(b2) +
         ' + {:.2f}'.format(a2) + 'log(x)',)
ax2.text(20, 4.45, "Pearson's correlation coefficient = " +
         '{:.4f}'.format(np.corrcoef(np.log(np.array(xVals)), np.array(averageActionTimes))[0][1]))


plt.show()
