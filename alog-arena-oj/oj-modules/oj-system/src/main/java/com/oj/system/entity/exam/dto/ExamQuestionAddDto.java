package com.oj.system.entity.exam.dto;

import lombok.Data;


import java.util.LinkedHashSet;
@Data
public class ExamQuestionAddDto {

    private Long examId;

    //一个竞赛可能有多个题目,所以使用一个集合
    //用LinkedHashSet<?> 是为了保证添加题目的有序性和可以去掉重复的数据
    private LinkedHashSet<Long> questionIdSet;
}
