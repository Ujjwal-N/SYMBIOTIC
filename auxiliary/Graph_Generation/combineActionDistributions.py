#folderNames = ['15', '25', '35']
import matplotlib.pyplot as plt
import numpy as np

folderNames = ['15', '25', '35']
xVals = []
dists = []
numDataPoints = 0
for name in folderNames:
    for numNodes in range(20, 120, 20):
        xVals.append(numNodes)
        currDist = []
        for foldNum in range(1, 11):
            with open(f"REUProj/experiments/{name}/{numNodes}-{foldNum}-actionDistribution.csv") as f:
                for line in f.readlines():
                    currDist.append(int(line.strip()))
                    numDataPoints += 1
        dists.append(currDist)

combinedDists = [[] for _ in range(5)]
for i in range(5):
    for j in range(len(folderNames)):
        combinedDists[i].extend(dists[j * 5 + i])

fig = plt.figure(figsize=(6, 4))
#fig.suptitle('Distribution of Actions vs Number of Nodes In Simulation')
# Creating axes instance
ax = fig.add_axes([0.15, 0.15, 0.7, 0.7])
ax.set_title('Distribution of Actions vs Number of Nodes')
ax.set_xticklabels(xVals)
ax.set_xlabel('Number of Nodes')
ax.set_ylabel('Distribution of Actions')

# Creating plot
bp = ax.boxplot(combinedDists)

print(numDataPoints)
# show plot
plt.show()
