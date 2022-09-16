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
            with open(f"../../hardhat/REUProj/experiments/{name}/{numNodes}-{foldNum}-timestamps.csv") as f:
                for line in f.readlines():
                    currTotal += float(line.strip())
                    totalActions += 1
        totalActionTimes[n] = currTotal / 10 / 1000 / 60
        averageActionTimes[n] = currTotal / 10 / 1000 / 30 / numNodes

fig = plt.figure()
fig.set_size_inches(w=4.7747, h=3.5)

# ax1 = fig.add_axes([0.15, 0.15, 0.8, 0.8])
# # ax1.set_title('Total Simulation Time (min) vs Number of Nodes')
# ax1.set_xlabel('Number of Nodes')
# ax1.set_ylabel('Total Simulation Time (min)')

# a1, b1 = np.polyfit(xVals, totalActionTimes, 1)
# scat1 = ax1.scatter(xVals, totalActionTimes)
# print(totalActionTimes)
# print(averageActionTimes)
# ax1.plot(np.array(xVals), a1 * np.array(xVals) + b1)
# ax1.text(20, 218, 'y = ' + '{:.2f}'.format(b1) +
#          ' + {:.2f}'.format(a1) + 'x',)
# ax1.text(20, 203, "Pearson's correlation coefficient = " +
#          '{:.4f}'.format(np.corrcoef(xVals, totalActionTimes)[0][1]))

ax2 = fig.add_axes([0.15, 0.15, 0.8, 0.8])
# ax2.set_title('Average Action Time (sec) vs Number of Nodes')
ax2.set_xlabel('Number of Nodes')
ax2.set_ylabel('Average Action Time (sec)')


a2, b2 = np.polyfit((np.array(xVals)),
                    np.array(averageActionTimes), 1)
scat2 = ax2.scatter(xVals, averageActionTimes)

ax2.plot(np.array(xVals), a2 * (np.array(xVals)) + b2)

ax2.text(20, 4.45, 'y = ' + '{:.2f}'.format(b2) +
         ' + {:.2f}'.format(a2) + 'log(x)',)
ax2.text(20, 4.3, "Pearson's correlation coefficient = " +
         '{:.4f}'.format(np.corrcoef(np.log(np.array(xVals)), np.array(averageActionTimes))[0][1]))


fig.savefig(f"averageActionTime.pdf", bbox_inches='tight')
plt.show()
