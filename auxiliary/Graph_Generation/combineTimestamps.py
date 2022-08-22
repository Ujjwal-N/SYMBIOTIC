# folderNames = ['15', '25', '35']
import matplotlib.pyplot as plt
import numpy as np

folderNames = [15, 25, 35]
totalNs = 5
xVals = np.array([i * 20 + 20 for i in range(totalNs)])
totalActionTimes = np.array([0.0 for i in range(totalNs)])
averageActionTimes = np.array([0.0 for i in range(totalNs)])
totalActions = 0

for n in range(totalNs):
    for name in folderNames:
        numNodes = n * 20 + 20
        currTotal = 0
        for foldNum in range(1, 11):
            with open(f"REUProj/experiments/{name}/{numNodes}-{foldNum}-timestamps.csv") as f:
                for line in f.readlines():
                    currTotal += float(line.strip())
                    totalActions += 1
        totalActionTimes[n] = currTotal / 10 / 1000 / 60
        averageActionTimes[n] = currTotal / 10 / 1000 / 30 / numNodes

fig = plt.figure(figsize=(6, 8))

ax1 = fig.add_axes([0.15, 0.1, 0.7, 0.35])
# ax1.set_title('Total Simulation Time (min) vs Number of Nodes')
ax1.set_xlabel('Number of Nodes')
ax1.set_ylabel('Total Simulation Time (min)')

a1, b1 = np.polyfit(xVals, totalActionTimes, 1)
scat1 = ax1.scatter(xVals, totalActionTimes)
print(totalActionTimes)
print(averageActionTimes)
ax1.plot(np.array(xVals), a1 * np.array(xVals) + b1)
ax1.text(20, 222, 'y = ' + '{:.2f}'.format(b1) +
         ' + {:.2f}'.format(a1) + 'x',)
ax1.text(20, 207, "Pearson's correlation coefficient = " +
         '{:.4f}'.format(np.corrcoef(xVals, totalActionTimes)[0][1]))

ax2 = fig.add_axes([0.15, 0.6, 0.7, 0.35])
# ax2.set_title('Average Action Time (sec) vs Number of Nodes')
ax2.set_xlabel('Number of Nodes')
ax2.set_ylabel('Average Action Time (sec)')

# xValsFinal = [0 for x in range(len(xVals))]
# averageActionTimesFinal = [0 for x in range(len(averageActionTimes))]
# count = 0
# for i in range(len(xVals) // len(folderNames)):
#     for j in range(len(folderNames)):
#         xValsFinal[count] = xVals[j * len(xVals) // len(folderNames) + i]
#         averageActionTimesFinal[count] = averageActionTimes[j *
#                                                             len(xVals) // len(folderNames) + i]
#         count += 1


a2, b2 = np.polyfit(np.log(np.array(xVals)),
                    np.array(averageActionTimes), 1)
a3, b3 = np.polyfit(np.array(xVals),
                    np.array(averageActionTimes), 1)
scat2 = ax2.scatter(xVals, averageActionTimes)

ax2.plot(np.array(xVals), a2 * np.log(np.array(xVals)) + b2)
ax2.plot(np.array(xVals), a3 * (np.array(xVals)) + b3)

ax2.text(20, 4.6, 'y = ' + '{:.2f}'.format(b2) +
         ' + {:.2f}'.format(a2) + 'log(x)',)
ax2.text(20, 4.45, "Pearson's correlation coefficient = " +
         '{:.4f}'.format(np.corrcoef(np.log(np.array(xVals)), np.array(averageActionTimes))[0][1]))


plt.show()
