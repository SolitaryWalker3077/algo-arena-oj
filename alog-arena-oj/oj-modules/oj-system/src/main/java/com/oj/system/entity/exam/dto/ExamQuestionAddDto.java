package com.oj.system.entity.exam.dto;

import lombok.Data;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Data
public class ExamQuestionAddDto {

    private Long examId;

    //一个竞赛可能有多个题目,所以使用一个集合
    private LinkedHashSet<Long> questionIdSet;
}
