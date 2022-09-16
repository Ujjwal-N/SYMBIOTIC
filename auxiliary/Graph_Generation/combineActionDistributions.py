#folderNames = ['15', '25', '35']
import matplotlib.pyplot as plt
import numpy as np

folderNames = ['15', '25', '35']
xVals = []
dists = []

for name in folderNames:
    for numNodes in range(20, 120, 20):
        xVals.append(numNodes)
        currDist = [0 for _ in range(numNodes)]
        for foldNum in range(1, 11):
            with open(f"../../hardhat/REUProj/experiments/{name}/{numNodes}-{foldNum}-actionDistribution.csv") as f:
                lineNum = 0
                for line in f.readlines():
                    currDist[lineNum] += int(line.strip()) / 10
                    lineNum += 1
        dists.append(currDist)

combinedDists = [[] for _ in range(5)]
for i in range(5):
    for j in range(len(folderNames)):
        combinedDists[i].extend(dists[j * 5 + i])

fig = plt.figure()
fig.set_size_inches(w=4.7747, h=3.5)
#fig.suptitle('Distribution of Actions vs Number of Nodes In Simulation')
# Creating axes instance
ax = fig.add_axes([0.15, 0.15, 0.8, 0.8])

ax.set_xticklabels(xVals)
ax.set_xlabel('Number of Nodes')
ax.set_ylabel('Distribution of Actions')

# Creating plot
bp = ax.boxplot(combinedDists)
fig.savefig(f"actionDistribution.pdf", bbox_inches='tight')
# show plot
plt.show()
